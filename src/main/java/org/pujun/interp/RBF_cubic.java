package org.pujun.interp;

import static java.lang.Math.pow;

/**
 * Created by milletpu on 16/3/16.
 */
public class RBF_cubic implements RBF_fn {

    public double rbf(final double r) {
        return pow(r,3);
    }

}
