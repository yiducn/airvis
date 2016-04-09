package org.pujun.correl;

import org.apache.commons.math3.stat.correlation.PearsonsCorrelation;

import java.util.Arrays;

/**
 * Created by milletpu on 16/4/9.
 */
public class Correlation {
    private double pearsonsResult;
    private double lagResult;

    public double getPearsonsResult(double[] x, double[] y){

        PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
        pearsonsResult = pearsonsCorrelation.correlation(x,y);

        return pearsonsResult;
    }

    public double getLagResult(double[] x, double[] y, int lag){  //arrayY后移lag位，arrayX前端截掉，arrayY后端截掉
        x = Arrays.copyOfRange(x, lag, x.length);
        y = Arrays.copyOfRange(y,0,y.length-lag);

        PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
        lagResult = pearsonsCorrelation.correlation(x,y);

        return lagResult;
    }

}
