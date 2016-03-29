package org.pujun.interp;

import static java.lang.Math.pow;
import static java.lang.Math.sqrt;

/**
 * Created by milletpu on 16/3/16.
 *
 * Use this class's method interp() to interpolate.
 */
public class RBF_interp {
    int dim, n;
    final double[][] points;
    final double[] values;
    double[] lambda;
    RBF_fn fn;

    /**
     * The n X dim matrix ptss inputs the data points, the vector valss the function
     * values. func contains the chosen radial basis function, derived from the
     * class RBF_fn.
     *
     * @param points the original data points
     * @param values the corresponding values
     * @param func   the selected rbf basis function
     */
    public RBF_interp(final double[][] points, final double[] values, final RBF_fn func){
        this.points = points;
        this.values = values;
        fn = func;
        dim = points[0].length;
        n = points.length;
        lambda = new double[n];

        int i,j;
        double[][] rbf = new double[n][n];
        double[] rhs = new double[n];

        for (i = 0;i<n;i++) {   // Fill the matrix φ(|r_i - r_j|) and the r.h.s. vector
            for (j = 0;j<n;j++) {
                rbf[i][j] = fn.rbf(rad(this.points[i],this.points[j]));
            }
            rhs[i] = values[i];
        }

        LUdcmp lu = new LUdcmp(rbf);   // Solve the set of linear equations to get λ
        lu.solve(rhs,lambda);
    }

    /**
     * Return the interpolated function value at a dim-dimensional point pt.
     *
     * @param pt one point to be interpolated
     * @return value of one interpolated point
     */
    public double interp(final double[] pt) {
        double fval, interpedValue = 0.;
        if (pt.length != dim) throw new IllegalArgumentException("pt size wrong");

        for (int i = 0;i<n;i++) {
            fval = fn.rbf(rad(pt,this.points[i]));          // = φ(|r_i - r_j|)
            interpedValue += lambda[i] * fval;              // = ∑( λ * φ(|r_i - r_j|) )

        }
        return interpedValue;
    }


    /**
     * Return the Euclidean distance between each two points.
     *
     * @param p1,p2
     * @return the Euclidean distance
     */
    public double rad(final double[] p1, final double[] p2) {
        double sum = 0.;
        for (int i = 0;i<dim;i++)
            sum += pow((p1[i] - p2[i]), 2);

        return sqrt(sum);
    }


}
